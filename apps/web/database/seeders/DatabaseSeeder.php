<?php

namespace Database\Seeders;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ],
        );

        $printers = $this->escposPhpSupportedPrinters();

        foreach ($printers as $printer) {
            $widthMm = $printer['width_mm'];
            $is58 = $widthMm <= 60;
            PrinterProfile::query()->updateOrCreate(
                ['name' => $printer['name'], 'is_builtin' => true],
                [
                    'user_id' => null,
                    'printer_model' => $printer['model'],
                    'paper_width_mm' => $widthMm,
                    'dpi' => $printer['dpi'] ?? 203,
                    'chars_per_line' => $printer['chars'],
                    'code_page' => 'CP437',
                    'image_max_width_dots' => $printer['dots'] ?? ($is58 ? 384 : ($widthMm >= 132 ? 1024 : 576)),
                    'image_max_bytes' => 1048576,
                    'settings_json' => [
                        'description' => $printer['name'].' (escpos-php supported profile)',
                        'source' => 'https://github.com/mike42/escpos-php#printers',
                    ],
                ],
            );
        }

        $generic = PrinterProfile::query()->where('name', 'Generic ESC/POS')->first();

        Listener::query()->firstOrCreate(
            ['external_id' => 'lst_default_9100'],
            [
                'user_id' => $admin->id,
                'name' => 'Default 9100',
                'host' => '0.0.0.0',
                'port' => 9100,
                'printer_profile_id' => $generic?->id,
                'status' => 'stopped',
                'fault_config_json' => [
                    'paper_out' => false,
                    'cover_open' => false,
                    'cutter_error' => false,
                    'offline' => false,
                ],
            ],
        );
    }

    /**
     * @return array<int, array{name:string,model:string,width_mm:int,chars:int,dpi?:int,dots?:int}>
     */
    private function escposPhpSupportedPrinters(): array
    {
        return [
            ['name' => 'Generic ESC/POS', 'model' => 'generic-escpos', 'width_mm' => 80, 'chars' => 48],
            ['name' => '3nStar RPT-008', 'model' => '3nstar-rpt-008', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Approx APPPOS80AM', 'model' => 'approx-apppos80am', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'AURES ODP-333', 'model' => 'aures-odp-333', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'AURES ODP-500', 'model' => 'aures-odp-500', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Bematech-4200-TH', 'model' => 'bematech-4200-th', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Bematech LR2000E', 'model' => 'bematech-lr2000e', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Birch PRP-085III', 'model' => 'birch-prp-085iii', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Bixolon SRP-350III', 'model' => 'bixolon-srp-350iii', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Bixolon SRP-350Plus', 'model' => 'bixolon-srp-350plus', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Black Copper BC-85AC', 'model' => 'black-copper-bc-85ac', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'CHD TH-305N', 'model' => 'chd-th-305n', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Citizen CBM1000-II', 'model' => 'citizen-cbm1000-ii', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Citizen CT-S310II', 'model' => 'citizen-ct-s310ii', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Dapper-Geyi Q583P', 'model' => 'dapper-geyi-q583p', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'Daruma DR800', 'model' => 'daruma-dr800', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'DR-MP200 (manufacturer unknown)', 'model' => 'dr-mp200', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'EPOS TEP 220M', 'model' => 'epos-tep-220m', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Elgin i9', 'model' => 'elgin-i9', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Epson EU-T332C', 'model' => 'epson-eu-t332c', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Epson FX-890', 'model' => 'epson-fx-890', 'width_mm' => 80, 'chars' => 80],
            ['name' => 'Epson TM-T20', 'model' => 'epson-tm-t20', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Epson TM-T20II', 'model' => 'epson-tm-t20ii', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Epson TM-T70', 'model' => 'epson-tm-t70', 'width_mm' => 80, 'chars' => 42],
            ['name' => 'Epson TM-T70II', 'model' => 'epson-tm-t70ii', 'width_mm' => 80, 'chars' => 42],
            ['name' => 'Epson TM-T81', 'model' => 'epson-tm-t81', 'width_mm' => 80, 'chars' => 42],
            ['name' => 'Epson TM-T82II', 'model' => 'epson-tm-t82ii', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Epson TM-T88II', 'model' => 'epson-tm-t88ii', 'width_mm' => 80, 'chars' => 42],
            ['name' => 'Epson TM-T88III', 'model' => 'epson-tm-t88iii', 'width_mm' => 80, 'chars' => 42],
            ['name' => 'Epson TM-T88IV', 'model' => 'epson-tm-t88iv', 'width_mm' => 80, 'chars' => 42],
            ['name' => 'Epson TM-T88V', 'model' => 'epson-tm-t88v', 'width_mm' => 80, 'chars' => 42, 'dpi' => 180, 'dots' => 512],
            ['name' => 'Epson TM-U220', 'model' => 'epson-tm-u220', 'width_mm' => 76, 'chars' => 33],
            ['name' => 'Epson TM-U295', 'model' => 'epson-tm-u295', 'width_mm' => 57, 'chars' => 35],
            ['name' => 'Epson TM-U590 and TM-U590P', 'model' => 'epson-tm-u590', 'width_mm' => 132, 'chars' => 70, 'dots' => 1024],
            ['name' => 'Equal (EQ-IT-001) POS-58', 'model' => 'equal-eq-it-001-pos-58', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'Everycom EC-58', 'model' => 'everycom-ec-58', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'Excelvan HOP-E200', 'model' => 'excelvan-hop-e200', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Excelvan HOP-E58', 'model' => 'excelvan-hop-e58', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'Excelvan HOP-E801', 'model' => 'excelvan-hop-e801', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Gainscha GP-2120TF', 'model' => 'gainscha-gp-2120tf', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'Gainscha GP-5890x', 'model' => 'gainscha-gp-5890x', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'Gainscha GP-U80300I', 'model' => 'gainscha-gp-u80300i', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'gprinter GP-U80160I', 'model' => 'gprinter-gp-u80160i', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'HOIN HOP-H58', 'model' => 'hoin-hop-h58', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'Ithaca iTherm 28', 'model' => 'ithaca-itherm-28', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Hasar HTP 250', 'model' => 'hasar-htp-250', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Metapace T-1', 'model' => 'metapace-t-1', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Metapace T-25', 'model' => 'metapace-t-25', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Nexa PX700', 'model' => 'nexa-px700', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Nyear NP100', 'model' => 'nyear-np100', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'OKI RT322', 'model' => 'oki-rt322', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'OKI 80 Plus III', 'model' => 'oki-80-plus-iii', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Orient BTP-R580', 'model' => 'orient-btp-r580', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'P-822D', 'model' => 'p-822d', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'P85A-401 (make unknown)', 'model' => 'p85a-401', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Partner Tech RP320', 'model' => 'partner-tech-rp320', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'POSLIGNE ODP200H-III-G', 'model' => 'posligne-odp200h-iii-g', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'QPOS Q58M', 'model' => 'qpos-q58m', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'Rongta RP326US', 'model' => 'rongta-rp326us', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Rongta RP58-U', 'model' => 'rongta-rp58-u', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'Rongta RP80USE', 'model' => 'rongta-rp80use', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'SAM4S GIANT-100DB', 'model' => 'sam4s-giant-100db', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Senor TP-100', 'model' => 'senor-tp-100', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Sewoo SLK-TS400', 'model' => 'sewoo-slk-ts400', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'SEYPOS PRP-96', 'model' => 'seypos-prp-96', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'SEYPOS PRP-300', 'model' => 'seypos-prp-300', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'SNBC BTP-R880NPIII', 'model' => 'snbc-btp-r880npiii', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Solux SX-TP-88300', 'model' => 'solux-sx-tp-88300', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Sicar POS-80', 'model' => 'sicar-pos-80', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Silicon SP-201 / RP80USE', 'model' => 'silicon-sp-201-rp80use', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'SPRT SP-POS88V', 'model' => 'sprt-sp-pos88v', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Star BSC10', 'model' => 'star-bsc10', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Star TSP100 ECO', 'model' => 'star-tsp100-eco', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Star TSP100III FuturePRNT', 'model' => 'star-tsp100iii-futureprnt', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Star TSP-650', 'model' => 'star-tsp-650', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Star TUP-592', 'model' => 'star-tup-592', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'TVS RP45 Shoppe', 'model' => 'tvs-rp45-shoppe', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Venus V248T', 'model' => 'venus-v248t', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Xeumior SM-8330', 'model' => 'xeumior-sm-8330', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Xprinter F-900', 'model' => 'xprinter-f-900', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Xprinter XP-365B', 'model' => 'xprinter-xp-365b', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Xprinter XP-58 Series', 'model' => 'xprinter-xp-58-series', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'Xprinter XP-80C', 'model' => 'xprinter-xp-80c', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Xprinter XP-90', 'model' => 'xprinter-xp-90', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'XPrinter XP-Q20011', 'model' => 'xprinter-xp-q20011', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Xprinter XP-Q800', 'model' => 'xprinter-xp-q800', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Zjiang NT-58H', 'model' => 'zjiang-nt-58h', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'Zjiang ZJ-5870', 'model' => 'zjiang-zj-5870', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'Zjiang ZJ-5890', 'model' => 'zjiang-zj-5890', 'width_mm' => 58, 'chars' => 32],
            ['name' => 'Zjiang ZJ-8220', 'model' => 'zjiang-zj-8220', 'width_mm' => 80, 'chars' => 48],
            ['name' => 'Zjiang ZJ-8250', 'model' => 'zjiang-zj-8250', 'width_mm' => 80, 'chars' => 48],
        ];
    }
}
